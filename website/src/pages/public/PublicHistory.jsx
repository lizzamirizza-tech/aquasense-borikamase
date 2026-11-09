import HistoryView from "../../components/HistoryView.jsx"
import { PageHeader } from "../../components/Section.jsx"

export default function PublicHistory() {
  return (
    <>
      <PageHeader
        title="Monitoring History"
      />
      <HistoryView />
    </>
  )
}
