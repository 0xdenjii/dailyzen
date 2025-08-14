export const AuthToken = {
  get: (): string | null => {
    return localStorage.getItem("authToken");
  },

  set: (token: string): void => {
    localStorage.setItem("authToken", token);
  },

  remove: (): void => {
    localStorage.removeItem("authToken");
  },
};
