import type { ImgHTMLAttributes } from "react";
export function RoomImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = "/room-placeholder.svg";
      }}
    />
  );
}
