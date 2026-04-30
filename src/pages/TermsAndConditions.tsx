import { useNavigate } from 'react-router-dom'
import { MobileContainer } from '@/components/ui/mobile-container'
import { ArrowLeftIcon } from '@/components/ui/icons'

export default function TermsAndConditions() {
  const navigate = useNavigate()

  return (
    <MobileContainer>
      <div className="relative flex h-full min-h-screen flex-col px-6 pb-8 pt-6 text-white md:min-h-[var(--device-height)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-base font-medium transition-opacity hover:opacity-80"
        >
          <ArrowLeftIcon className="text-white" />
          <span>Back</span>
        </button>

        <h1 className="mt-6 text-2xl font-bold">Voice Banking Terms & Conditions</h1>

        <div className="mt-5 space-y-4 overflow-y-auto rounded-2xl bg-white/10 p-4 text-sm leading-6 text-white/95">
          <p>
            By using Voice Banking, you consent to voice-based interactions for authentication and banking
            assistance.
          </p>
          <p>
            Your voice responses may be processed and stored securely for verification, fraud prevention, and
            service improvement in accordance with applicable policies.
          </p>
          <p>
            You are responsible for keeping your device secure. Do not share OTPs, account credentials, or sensitive
            personal information over unsecured channels.
          </p>
          <p>
            Voice verification outcomes are subject to environmental and technical factors. In case of mismatch,
            additional verification steps may be required.
          </p>
          <p>
            Transaction and account information displayed in demo flows may be simulated. Actual banking operations
            are subject to backend availability and policy controls.
          </p>
          <p>
            Continued usage of this application indicates acceptance of these terms and any future updates.
          </p>
        </div>
      </div>
    </MobileContainer>
  )
}
