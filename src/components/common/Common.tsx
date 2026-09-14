import { Alert, Button, Empty, Skeleton, Table, type TableProps } from "antd";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./Common.module.css";
export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className={styles.heading}>
      <div>
        {back && (
          <Button
            type="text"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            ย้อนกลับ
          </Button>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function DataTable<T extends object>(props: TableProps<T>) {
  return (
    <Table<T>
      rowKey="id"
      size="middle"
      scroll={{ x: 850 }}
      pagination={{ pageSize: 8, showSizeChanger: true }}
      locale={{ emptyText: <Empty description="ไม่พบรายการ" /> }}
      {...props}
    />
  );
}
export function QueryState({
  isLoading,
  error,
  retry,
  children,
}: {
  isLoading: boolean;
  error: Error | null;
  retry: () => unknown;
  children: ReactNode;
}) {
  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (error)
    return (
      <Alert
        type="error"
        showIcon
        title="ไม่สามารถโหลดข้อมูล"
        description={error.message}
        action={<Button onClick={retry}>ลองอีกครั้ง</Button>}
      />
    );
  return <>{children}</>;
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.panel} ${className}`}>{children}</section>
  );
}
