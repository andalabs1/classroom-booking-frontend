import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { mockService } from "./mockService";
export function useDatabase() {
  return useQuery({ queryKey: ["database"], queryFn: mockService.database });
}
export function useAction<T, R>(
  action: (value: T) => Promise<R>,
  success?: string,
) {
  const client = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["database"] });
      void client.invalidateQueries({ queryKey: ["notifications"] });
      if (success) void message.success(success);
    },
    onError: (error: Error) => {
      void message.error(error.message);
    },
  });
}
