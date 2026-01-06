import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from '@react-email/components'
import * as React from 'react'

interface BaseLayoutProps {
    preview: string
    heading: string
    children: React.ReactNode
    clinicName?: string
}

export const BaseLayout = ({
    preview,
    heading,
    children,
    clinicName = 'CliniGo',
}: BaseLayoutProps) => {
    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
                        <Section className="mt-[32px]">
                            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                {heading}
                            </Heading>
                        </Section>
                        {children}
                        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                        <Text className="text-[#666666] text-[12px] leading-[24px]">
                            Este email foi enviado por <strong>{clinicName}</strong> via CliniGo.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    )
}
