import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
export function ErrorPage({ code = "404" }: { code?: "403" | "404" | "500" }) {
  const navigate = useNavigate();
  return (
    <Result
      status={code}
      title={code}
      subTitle={
        code === "403"
          ? "คุณไม่มีสิทธิ์เข้าถึงหน้านี้"
          : code === "500"
            ? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
            : "ไม่พบหน้าที่คุณต้องการ"
      }
      extra={
        <Button type="primary" onClick={() => navigate("/rooms")}>
          กลับหน้าห้องเรียน
        </Button>
      }
    />
  );
}
