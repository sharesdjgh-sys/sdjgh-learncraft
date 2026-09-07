"use client";

import { useState } from "react";
import { School } from "lucide-react";
import { AccountManager } from "@/components/admin/account-manager";
import type { AccountRole } from "@/features/accounts/model";
import styles from "./accounts.module.css";

export function AdminAccounts() {
  const [role, setRole] = useState<AccountRole>("STUDENT");
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header>
          <p className={styles.eyebrow}><School size={14} />학교 관리<span className="mx-1 text-slate-300">/</span>계정</p>
          <h1 className={styles.heading}>학교 계정 관리</h1>
          <p className={styles.description}>학생과 선생님의 계정을 등록하고, 전입·전출에 맞춰 관리하세요.</p>
        </header>
        <AccountManager key={role} role={role} onRoleChange={setRole} />
      </div>
    </div>
  );
}
