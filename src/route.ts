import dayjs from "dayjs";
import { FastifyInstance } from "fastify";
import { prisma } from "./lib/prisma";
import { z } from "zod";

export async function appRoutes(app: FastifyInstance) {
  app.post("/habits", async (request) => {
    const createhabitBody = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
    });

    const { title, weekDays } = createhabitBody.parse(request.body);

    const today = dayjs().startOf("day").toDate();

    await prisma.habit.create({
      data: {
        title,
        createdAt: today,
        weekDays: {
          create: weekDays.map((weekDay) => {
            return {
              week_day: weekDay,
            };
          }),
        },
      },
    });
  });

  app.get("/day", async (request) => {
    const getDayParams = z.object({
      date: z.coerce.date(),
    });

    const { date } = getDayParams.parse(request.query);

    const weekDay = dayjs(date).get("day");

    const possibleHabits = await prisma.habit.findMany({
      where: {
        createdAt: {
          lte: date,
        },
        weekDays: {
          some: {
            week_day: weekDay,
          },
        },
      },
    });

    const parsedDate = dayjs(date).startOf("day");

    const day = await prisma.day.findUnique({
      where: {
        date: parsedDate.toDate(),
      },
      include: {
        DayHabits: true,
      },
    });

    const completedhabits = day?.DayHabits.map((DayHabits) => {
      return DayHabits.habit_id;
    });

    return { possibleHabits, completedhabits };
  });
}
