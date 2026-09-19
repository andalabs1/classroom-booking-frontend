import { useDeferredValue, useState } from "react";
import { Input, Select } from "antd";
import { useAuditLogs } from "../../services/queries";
import type { AuditLog } from "../../api/admin";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import styles from "./Admin.module.css";

export function AuditLogsPage() {
  const [action, setAction] = useState<string>();
  const [entity, setEntity] = useState<string>();
  const deferredAction = useDeferredValue(action);
  const deferredEntity = useDeferredValue(entity);
  const query = useAuditLogs({ action: deferredAction, entity: deferredEntity, limit: 100 });
  return (
    <>
      <PageHeader title="บันทึกการดำเนินการ" subtitle="ตรวจสอบประวัติการเปลี่ยนแปลงข้อมูลในระบบ" />
      <QueryState isLoading={query.isLoading} error={query.error} retry={query.refetch}>
        <Panel>
          <div className={styles.filters}>
            <Input allowClear placeholder="กรองตาม action เช่น UPDATE" value={action} onChange={(event) => setAction(event.target.value || undefined)} />
            <Select allowClear placeholder="ทุกประเภทข้อมูล" value={entity} onChange={setEntity} options={["BOOKING", "CLASSROOM", "USER"].map((value) => ({ value, label: value }))} />
          </div>
          <DataTable<AuditLog> dataSource={query.data?.items} columns={[
            { title: "เวลา", render: (_, log) => log.createdAt.slice(0, 16).replace("T", " ") }, { title: "ผู้ดำเนินการ", render: (_, log) => log.user?.name ?? "ระบบ" },
            { title: "Action", dataIndex: "action" }, { title: "ข้อมูล", dataIndex: "entity" }, { title: "ID", dataIndex: "entityId" },
          ]} />
        </Panel>
      </QueryState>
    </>
  );
}
