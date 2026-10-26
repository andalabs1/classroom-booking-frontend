import type { ImgHTMLAttributes } from "react";
/**
 * แสดงรูปห้องและเปลี่ยนเป็น placeholder เมื่อโหลดล้มเหลว โดยปิด onerror ก่อนเพื่อกันวนซ้ำ
 */
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
