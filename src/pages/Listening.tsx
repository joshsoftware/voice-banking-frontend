import Home from './Home'
import { ListeningSheet } from '@/components/home/ListeningSheet'

interface ListeningProps {
  onSubmit: () => void
}

export default function Listening({ onSubmit }: ListeningProps) {
  return <Home bottomSheet={<ListeningSheet onSubmit={onSubmit} />} />
}
