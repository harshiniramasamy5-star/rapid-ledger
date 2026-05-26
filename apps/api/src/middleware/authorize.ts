import { can, type Role } from "./permissions";

export function authorize(action: string) {
  return ({ user, set }: { user?: { id: string; role: string }; set: { status?: number | string } }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized: no token" };
    }
    if (!can(user.role as Role, action)) {
      set.status = 403;
      return { error: "Forbidden: insufficient permissions", role: user.role, required: action };
    }
  };
}
