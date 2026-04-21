# Implicații schema DB — câmpuri și stări necesare

**De validat cu:** COA (implementare), CJA (conformitate)

## Câmpuri noi pe Tenant

```
model Tenant {
  // ... câmpuri existente ...
  
  // Lifecycle
  lastActivityAt    DateTime?   // ultima acțiune utilizator (login, input, generare)
  suspendedAt       DateTime?   // momentul suspendării (neplată)
  expiresAt         DateTime?   // data la care se șterg datele (30 zile post-suspendare)
  
  // Abonament
  subscriptionStatus SubscriptionStatus @default(NONE) // NONE, TRIAL, ACTIVE, GRACE, SUSPENDED, EXPIRED
  subscriptionEnd    DateTime?   // data curentă de expirare abonament
  
  // Export
  lastExportAt      DateTime?   // ultima descărcare arhivă
  exportUrl         String?     // URL temporar arhivă (signed, 24h)
}

enum SubscriptionStatus {
  NONE        // nu a plătit niciodată
  TRIAL       // cont pilot / trial (isPilot=true)
  ACTIVE      // abonament activ
  GRACE       // abonament expirat, grace period 7 zile
  SUSPENDED   // suspendat, read-only 30 zile
  EXPIRED     // expirat, programat pentru ștergere
}
```

## Câmpuri noi pe ServicePurchase

```
model ServicePurchase {
  // ... câmpuri existente ...
  
  // Upgrade tracking
  previousLayer    Int?        // layer-ul anterior (pentru upgrade history)
  upgradedFrom     String?     // ID-ul purchase-ului anterior
  
  // Valabilitate
  activatedAt      DateTime    @default(now())
  validUntil       DateTime?   // null = valid cât abonamentul e activ
}
```

## Model nou: GdprRequest

```
model GdprRequest {
  id           String   @id @default(cuid())
  tenantId     String
  type         String   // ERASURE, EXPORT, ACCESS
  status       String   // PENDING, IN_PROGRESS, COMPLETED, REJECTED
  requestedAt  DateTime @default(now())
  deadline     DateTime // requestedAt + 30 zile
  completedAt  DateTime?
  processedBy  String?  // userId DPO
  notes        String?
  
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@map("gdpr_requests")
}
```

## Model nou: AccountEvent (jurnal lifecycle)

```
model AccountEvent {
  id        String   @id @default(cuid())
  tenantId  String
  event     String   // CREATED, ACTIVATED, SUSPENDED, GRACE, EXPORT, REACTIVATED, DELETED, GDPR_REQUEST, UPGRADE, DOWNGRADE
  metadata  Json?    // detalii specifice evenimentului
  createdAt DateTime @default(now())
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, createdAt])
  @@map("account_events")
}
```

## Stări și tranziții

```
NONE ──(plătește abonament)──→ ACTIVE
NONE ──(creare cont pilot)──→ TRIAL
TRIAL ──(plătește)──→ ACTIVE
TRIAL ──(30 zile fără plată)──→ EXPIRED
ACTIVE ──(plata eșuează)──→ GRACE (7 zile)
GRACE ──(plătește)──→ ACTIVE
GRACE ──(7 zile expirate)──→ SUSPENDED
SUSPENDED ──(plătește)──→ ACTIVE (reactivare)
SUSPENDED ──(30 zile)──→ EXPIRED
EXPIRED ──(plătește)──→ ACTIVE (dacă datele nu au fost șterse)
EXPIRED ──(auto-cleanup)──→ DELETED
ORICE ──(cerere GDPR)──→ DELETED (30 zile)
```
