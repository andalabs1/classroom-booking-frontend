import { useDeferredValue, useMemo, useState } from "react";
import { Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import { useAuditLogs } from "../../services/queries";
import type { AuditLog } from "../../api/admin";
import { DataTable, PageHeader, Panel, QueryState } from "../../components/common/Common";
import styles from "./Admin.module.css";

export function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const [action, setAction] = useState<string>();
  const [entity, setEntity] = useState<string>();
  const deferredAction = useDeferredValue(action);
  const deferredEntity = useDeferredValue(entity);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language.startsWith("th") ? "th-TH" : "en-GB", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    [i18n.language],
  );
  const query = useAuditLogs({ action: deferredAction, entity: deferredEntity, limit: 100 });
  return (
    <>
      <PageHeader title={t("adminAudit")} subtitle={t("adminAuditSubtitle")} />
      <QueryState isLoading={query.isLoading} error={query.error} retry={query.refetch}>
        <Panel>
          <div className={styles.filters}>
            <Input allowClear placeholder={t("adminFilterAction")} value={action} onChange={(event) => setAction(event.target.value || undefined)} />
            <Select allowClear placeholder={t("adminAllEntities")} value={entity} onChange={setEntity} options={["BOOKING", "CLASSROOM", "USER"].map((value) => ({ value, label: value }))} />
          </div>
          <DataTable<AuditLog> dataSource={query.data?.items} columns={[
            { title: t("adminLogTime"), render: (_, log) => dateFormatter.format(new Date(log.createdAt)) }, { title: t("adminActor"), render: (_, log) => log.user?.name ?? t("adminSystem") },
            { title: "Action", dataIndex: "action" }, { title: t("adminEntity"), dataIndex: "entity" }, { title: "ID", dataIndex: "entityId" },
          ]} />
        </Panel>
      </QueryState>
    </>
  );
}
