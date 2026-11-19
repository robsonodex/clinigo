import './preview-home.css'
import { NavbarSection } from './NavbarSection'
import { HeroStageSection } from './HeroStageSection'
import { OperationalContrastSection } from './OperationalContrastSection'
import { DayInLifeSection } from './DayInLifeSection'
import { SpecialtyXRaySection } from './SpecialtyXRaySection'
import { GovernanceSection } from './GovernanceSection'
import { OperationalSimulator } from './OperationalSimulator'
import { PlansSection } from './PlansSection'
import { FaqSection } from './FaqSection'
import { FinalCtaSection } from './FinalCtaSection'
import { FooterSection } from './FooterSection'

export function PreviewLandingPage() {
    return (
        <div className="clinigo-editorial min-h-screen antialiased overflow-x-clip selection:bg-[#155E4B] selection:text-white">
            <NavbarSection />
            <main>
                <HeroStageSection />
                <OperationalContrastSection />
                <DayInLifeSection />
                <SpecialtyXRaySection />
                <GovernanceSection />
                <OperationalSimulator />
                <PlansSection />
                <FaqSection />
                <FinalCtaSection />
            </main>
            <FooterSection />
        </div>
    )
}
