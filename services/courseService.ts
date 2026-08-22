import { connectToDatabase } from '@/lib/mongodb';
import { CourseModel } from '@/models/Course';
import { FILM_COURSES, FilmCourse } from '@/src/types';

let memoryCourses: FilmCourse[] = [...FILM_COURSES];

export async function getAllCourses(): Promise<FilmCourse[]> {
  const db = await connectToDatabase();
  if (db) {
    const count = await CourseModel.countDocuments();
    if (count === 0) {
      await CourseModel.insertMany(FILM_COURSES);
    }
    const docs = await CourseModel.find({}).lean();
    return docs.map(doc => ({
      name: doc.name,
      tier: doc.tier as any,
      monthlyFee: doc.monthlyFee,
      instructor: doc.instructor,
    }));
  }

  return memoryCourses;
}

export async function createCourse(course: FilmCourse): Promise<FilmCourse> {
  const db = await connectToDatabase();
  if (db) {
    await CourseModel.create(course);
  } else {
    memoryCourses.push(course);
  }
  return course;
}

export async function updateCourses(courses: FilmCourse[]): Promise<FilmCourse[]> {
  const db = await connectToDatabase();
  if (db) {
    await CourseModel.deleteMany({});
    await CourseModel.insertMany(courses);
    return courses;
  }

  memoryCourses = [...courses];
  return memoryCourses;
}
