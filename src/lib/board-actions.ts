import { Prisma } from "@prisma/client";
import {
  applyCategoryInterestSignal,
  applyFollowedBoardInterestSignal,
} from "@/lib/interest-signals";
import { prisma } from "@/lib/prisma";

type BoardActionResult<T> =
  | {
      ok: true;
      data: T;
      status: number;
    }
  | {
      ok: false;
      errors: Record<string, string>;
      status: number;
    };

export async function savePublishedPinToBoard(input: {
  boardId: string;
  pinId: string;
  userId: string;
}): Promise<
  BoardActionResult<{
    board: {
      coverPinId: string | null;
      id: string;
      pinCount: number;
    };
    boardPin: {
      boardId: string;
      id: string;
      pinId: string;
    };
    pin: {
      saveCount: number;
    };
  }>
> {
  const [pin, board] = await Promise.all([
    prisma.pin.findFirst({
      where: {
        id: input.pinId,
        status: "PUBLISHED",
      },
      select: {
        categoryId: true,
        id: true,
      },
    }),
    prisma.board.findFirst({
      where: {
        id: input.boardId,
        ownerUserId: input.userId,
      },
      select: {
        coverPinId: true,
        id: true,
      },
    }),
  ]);

  if (!pin) {
    return actionError(404, { pin: "Only published Pins can be saved." });
  }

  if (!board) {
    return actionError(404, { boardId: "Board not found." });
  }

  try {
    const data = await prisma.$transaction(async (transaction) => {
      const boardPin = await transaction.boardPin.create({
        data: {
          boardId: input.boardId,
          pinId: input.pinId,
          savedByUserId: input.userId,
        },
        select: {
          boardId: true,
          id: true,
          pinId: true,
        },
      });

      const updatedPin = await transaction.pin.update({
        where: {
          id: input.pinId,
        },
        data: {
          saveCount: {
            increment: 1,
          },
        },
        select: {
          saveCount: true,
        },
      });

      const updatedBoard = await transaction.board.update({
        where: {
          id: input.boardId,
        },
        data: {
          coverPinId: board.coverPinId ?? input.pinId,
          pinCount: {
            increment: 1,
          },
        },
        select: {
          coverPinId: true,
          id: true,
          pinCount: true,
        },
      });

      await transaction.userEvent.create({
        data: {
          eventType: "SAVE_PIN",
          metadataJson: {
            boardId: input.boardId,
          },
          targetId: input.pinId,
          targetType: "PIN",
          userId: input.userId,
        },
      });

      return {
        board: updatedBoard,
        boardPin,
        pin: updatedPin,
      };
    });

    await applyCategoryInterestSignal({
      categoryId: pin.categoryId,
      signal: "save",
      userId: input.userId,
    });

    return actionOk(201, data);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return actionError(409, {
        save: "This Pin is already saved to that Board.",
      });
    }

    throw error;
  }
}

export async function removePinFromBoard(input: {
  boardId: string;
  pinId: string;
  userId: string;
}): Promise<
  BoardActionResult<{
    board: {
      coverPinId: string | null;
      id: string;
      pinCount: number;
    };
    pin: {
      saveCount: number;
    };
    removed: true;
  }>
> {
  return prisma.$transaction(async (transaction) => {
    const board = await transaction.board.findUnique({
      where: {
        id: input.boardId,
      },
      select: {
        coverPinId: true,
        id: true,
        ownerUserId: true,
      },
    });

    if (!board) {
      return actionError(404, { board: "Board not found." });
    }

    if (board.ownerUserId !== input.userId) {
      return actionError(403, {
        board: "Only the Board owner can remove Pins.",
      });
    }

    const boardPin = await transaction.boardPin.findUnique({
      where: {
        boardId_pinId: {
          boardId: input.boardId,
          pinId: input.pinId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!boardPin) {
      return actionError(404, { pin: "Pin is not saved to this Board." });
    }

    await transaction.boardPin.delete({
      where: {
        id: boardPin.id,
      },
    });

    const [remainingBoardPins, remainingPinSaves, nextCover] =
      await Promise.all([
        transaction.boardPin.count({
          where: {
            boardId: input.boardId,
          },
        }),
        transaction.boardPin.count({
          where: {
            pinId: input.pinId,
          },
        }),
        board.coverPinId === input.pinId
          ? transaction.boardPin.findFirst({
              where: {
                boardId: input.boardId,
              },
              orderBy: {
                createdAt: "desc",
              },
              select: {
                pinId: true,
              },
            })
          : Promise.resolve(null),
      ]);

    const updatedPin = await transaction.pin.update({
      where: {
        id: input.pinId,
      },
      data: {
        saveCount: remainingPinSaves,
      },
      select: {
        saveCount: true,
      },
    });

    const updatedBoard = await transaction.board.update({
      where: {
        id: input.boardId,
      },
      data: {
        coverPinId:
          board.coverPinId === input.pinId ? (nextCover?.pinId ?? null) : undefined,
        pinCount: remainingBoardPins,
      },
      select: {
        coverPinId: true,
        id: true,
        pinCount: true,
      },
    });

    await transaction.userEvent.create({
      data: {
        eventType: "UNSAVE_PIN",
        metadataJson: {
          boardId: input.boardId,
        },
        targetId: input.pinId,
        targetType: "PIN",
        userId: input.userId,
      },
    });

    return actionOk(200, {
        board: updatedBoard,
        pin: updatedPin,
        removed: true,
    });
  });
}

export async function followPublicBoard(input: {
  boardId: string;
  userId: string;
}): Promise<
  BoardActionResult<{
    changed: boolean;
    followerCount: number;
    following: true;
  }>
> {
  const board = await prisma.board.findFirst({
    where: {
      id: input.boardId,
      visibility: "PUBLIC",
    },
    select: {
      followerCount: true,
      id: true,
      ownerUserId: true,
    },
  });

  if (!board) {
    return actionError(404, { board: "Board not found." });
  }

  if (board.ownerUserId === input.userId) {
    return actionError(400, { board: "You cannot follow your own Board." });
  }

  try {
    const data = await prisma.$transaction(async (transaction) => {
      await transaction.boardFollow.create({
        data: {
          boardId: input.boardId,
          userId: input.userId,
        },
      });

      const updatedBoard = await transaction.board.update({
        where: {
          id: input.boardId,
        },
        data: {
          followerCount: {
            increment: 1,
          },
        },
        select: {
          followerCount: true,
        },
      });

      await transaction.userEvent.create({
        data: {
          eventType: "FOLLOW_BOARD",
          targetId: input.boardId,
          targetType: "BOARD",
          userId: input.userId,
        },
      });

      return {
        changed: true,
        followerCount: updatedBoard.followerCount,
        following: true as const,
      };
    });

    await applyFollowedBoardInterestSignal({
      boardId: input.boardId,
      userId: input.userId,
    });

    return actionOk(200, data);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return actionOk(200, {
          changed: false,
          followerCount: board.followerCount,
          following: true,
      });
    }

    throw error;
  }
}

export async function unfollowBoard(input: {
  boardId: string;
  userId: string;
}): Promise<
  BoardActionResult<{
    changed: boolean;
    followerCount: number;
    following: false;
  }>
> {
  const board = await prisma.board.findUnique({
    where: {
      id: input.boardId,
    },
    select: {
      followerCount: true,
      id: true,
    },
  });

  if (!board) {
    return actionError(404, { board: "Board not found." });
  }

  const data = await prisma.$transaction(async (transaction) => {
    const deleted = await transaction.boardFollow.deleteMany({
      where: {
        boardId: input.boardId,
        userId: input.userId,
      },
    });

    if (deleted.count === 0) {
      return {
        changed: false,
        followerCount: board.followerCount,
        following: false as const,
      };
    }

    const updatedBoard = await transaction.board.updateMany({
      where: {
        followerCount: {
          gt: 0,
        },
        id: input.boardId,
      },
      data: {
        followerCount: {
          decrement: 1,
        },
      },
    });

    const currentBoard = await transaction.board.findUnique({
      where: {
        id: input.boardId,
      },
      select: {
        followerCount: true,
      },
    });

    if (updatedBoard.count > 0) {
      await transaction.userEvent.create({
        data: {
          eventType: "UNFOLLOW_BOARD",
          targetId: input.boardId,
          targetType: "BOARD",
          userId: input.userId,
        },
      });
    }

    return {
      changed: true,
      followerCount: currentBoard?.followerCount ?? 0,
      following: false as const,
    };
  });

  return actionOk(200, data);
}

function actionOk<T>(status: number, data: T): BoardActionResult<T> {
  return {
    ok: true,
    data,
    status,
  };
}

function actionError<T>(
  status: number,
  errors: Record<string, string>,
): BoardActionResult<T> {
  return {
    ok: false,
    errors,
    status,
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
