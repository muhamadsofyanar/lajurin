"use server";

import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, lessonProgress, lessons } from "@/lib/schema";

export async function toggleLessonCompleteAction(courseId: string, lessonId: string) {
  const user = await requireUser();
  const [authorizedLesson] = await db.select({ id: lessons.id, position: lessons.position })
    .from(enrollments)
    .innerJoin(lessons, eq(enrollments.courseId, lessons.courseId))
    .where(and(
      eq(enrollments.userId, user.id),
      eq(enrollments.courseId, courseId),
      eq(lessons.id, lessonId),
    )).limit(1);
  if (!authorizedLesson) redirect("/member");

  const [existing] = await db.select({ id: lessonProgress.id }).from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId))).limit(1);

  if (existing) {
    await db.delete(lessonProgress).where(eq(lessonProgress.id, existing.id));
    revalidatePath(`/member/courses/${courseId}`);
    return;
  }

  await db.insert(lessonProgress).values({ userId: user.id, lessonId }).onConflictDoNothing();
  const allLessons = await db.select({ id: lessons.id, position: lessons.position }).from(lessons)
    .where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.position));
  const next = allLessons.find((lesson) => lesson.position > authorizedLesson.position);
  revalidatePath(`/member/courses/${courseId}`);
  if (next && next.id !== lessonId) redirect(`/member/courses/${courseId}?lesson=${next.id}`);
}
