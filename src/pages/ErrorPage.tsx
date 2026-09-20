import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
export function ErrorPage({ code = "404" }: { code?: "403" | "404" | "500" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Result
      status={code}
      title={code}
      subTitle={
        code === "403"
          ? t("errorForbidden")
          : code === "500"
            ? t("errorUnexpected")
            : t("errorNotFound")
      }
      extra={
        <Button type="primary" onClick={() => navigate("/rooms")}>
          {t("roomBack")}
        </Button>
      }
    />
  );
}
