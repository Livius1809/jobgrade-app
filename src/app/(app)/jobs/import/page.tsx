import JobImportForm from "./JobImportForm"

export const metadata = { title: "Import posturi din Excel" }

export default function ImportJobsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import posturi din Excel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Importă posturi în bloc folosind un fișier Excel (.xlsx)
        </p>
      </div>
      <JobImportForm />
    </div>
  )
}
