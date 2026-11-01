"use client";

import { login } from "../actions";
import { ActionForm, Field } from "../_components/form";

export function LoginForm() {
  return (
    <ActionForm action={login} submit="Sign in" compact>
      <Field name="email" label="Email" type="email" />
      <Field name="password" label="Password" type="password" />
    </ActionForm>
  );
}
