import HistoryView from "../../components/HistoryView.jsx"
import { PageHeader } from "../../components/Section.jsx"

export default function AdminHistory() {
  return (
    <>
      <PageHeader title="Monitoring History" />
      <HistoryView allowExport />
    </>
  )
}
