'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/mongodb';
import { hashPassword, comparePassword, createSession, deleteSession } from '@/lib/auth';
import type { User } from '@/types';

const emailSchema = z.string().email({ message: "Invalid email address." });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters long." });

const SignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required." }),
});

export type FormState = {
  message: string;
  type: 'success' | 'error';
} | null;


export async function signupAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = SignupSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.errors.map((e) => e.message).join(', '),
      type: 'error',
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const db = await getDb();
    const existingUser = await db.collection<User>('users').findOne({ email });

    if (existingUser) {
      return { message: 'User with this email already exists.', type: 'error' };
    }

    const hashedPassword = await hashPassword(password);
    const result = await db.collection<User>('users').insertOne({
      email,
      hashedPassword,
      createdAt: new Date(),
    } as Omit<User, '_id'> & { hashedPassword: string }); // Type assertion for insertion

    if (!result.insertedId) {
        return { message: 'Failed to create user account.', type: 'error' };
    }

    await createSession(result.insertedId.toString(), email);

  } catch (error) {
    console.error('Signup error:', error);
    return { message: 'An unexpected error occurred. Please try again.', type: 'error' };
  }
  
  redirect('/profile');
  // return { message: 'Account created successfully! Redirecting...', type: 'success' };
}

export async function loginAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
     return {
      message: validatedFields.error.errors.map((e) => e.message).join(', '),
      type: 'error',
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const db = await getDb();
    const user = await db.collection<User>('users').findOne({ email });

    if (!user || !user.hashedPassword) {
      return { message: 'Invalid email or password.', type: 'error' };
    }

    const passwordsMatch = await comparePassword(password, user.hashedPassword);
    if (!passwordsMatch) {
      return { message: 'Invalid email or password.', type: 'error' };
    }
    
    // Ensure user._id is converted to string if it's an ObjectId
    const userId = typeof user._id === 'string' ? user._id : user._id.toString();
    await createSession(userId, user.email);

  } catch (error) {
    console.error('Login error:', error);
    return { message: 'An unexpected error occurred. Please try again.', type: 'error' };
  }

  redirect('/profile');
  // return { message: 'Logged in successfully! Redirecting...', type: 'success' };
}

export async function logoutAction() {
  await deleteSession();
  redirect('/login');
}
