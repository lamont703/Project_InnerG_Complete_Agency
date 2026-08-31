"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { firstSchool } from "@/lib/school/store";
import {
  addSection, createLesson, deleteSection, setLessonPublished,
} from "@/lib/school/learning-store";

/**
 * Authoring actions, each re-checking isAdmin() on top of the middleware gate.
 * Same reason as everywhere else in the console: that middleware fails open on
 * an auth exception, and these writes decide what students are taught and what
 * hours they can earn.
 */
export async function createLessonAction(f: {
  programId: string; scheduleBlockId: string;
  title: string; summary: string; estimatedMinutes: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const school = await firstSchool();
  if (!school) return { ok: false, error: "No school on file." };
  if (!f.scheduleBlockId) return { ok: false, error: "Choose which online class this belongs to." };

  const res = await createLesson({ schoolId: school.id, ...f });
  if (res.ok) revalidatePath("/school/lessons");
  return res;
}

export async function addSectionAction(f: {
  lessonId: string; title: string; body: string;
  question: string; options: string[]; answerIndex: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const res = await addSection({
    lessonId: f.lessonId, title: f.title, body: f.body,
    question: f.question.trim() || null,
    options: f.options, answerIndex: f.answerIndex,
  });
  if (res.ok) revalidatePath(`/school/lessons/${f.lessonId}`);
  return res;
}

export async function deleteSectionAction(
  sectionId: string, lessonId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const res = await deleteSection(sectionId);
  if (res.ok) revalidatePath(`/school/lessons/${lessonId}`);
  return res;
}

export async function setPublishedAction(
  lessonId: string, published: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const res = await setLessonPublished(lessonId, published);
  if (res.ok) {
    revalidatePath(`/school/lessons/${lessonId}`);
    revalidatePath("/school/lessons");
  }
  return res;
}
