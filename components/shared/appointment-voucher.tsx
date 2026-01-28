'use client'

import React from 'react'
import { CheckCircle2 } from 'lucide-react'

interface AppointmentVoucherProps {
    patientName: string
    appointmentDate: string
    appointmentTime: string
    doctorName: string
    qrCodeImage: string
    clinicName?: string
    clinicAddress?: string
    clinicPhone?: string
    appointmentType?: string
}

/**
 * Componente visual do comprovante de agendamento
 * Será convertido em PNG usando html-to-image
 */
export const AppointmentVoucher = React.forwardRef<HTMLDivElement, AppointmentVoucherProps>(
    (
        {
            patientName,
            appointmentDate,
            appointmentTime,
            doctorName,
            qrCodeImage,
            clinicName,
            clinicAddress,
            clinicPhone,
            appointmentType,
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className="w-[400px] bg-white rounded-lg overflow-hidden shadow-lg font-sans"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
                {/* Header verde com check */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                    <h1 className="text-white text-xl font-bold">Agendamento Confirmado!</h1>
                </div>

                {/* Informações do paciente */}
                <div className="px-6 py-4 space-y-2">
                    <div>
                        <p className="text-sm text-gray-600 font-medium">Paciente:</p>
                        <p className="text-base font-semibold text-gray-900">{patientName}</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 font-medium">Data:</p>
                        <p className="text-base font-semibold text-gray-900">
                            {appointmentDate} às {appointmentTime}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 font-medium">Médico:</p>
                        <p className="text-base font-semibold text-gray-900">Dr(a). {doctorName}</p>
                    </div>

                    {appointmentType && (
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Tipo:</p>
                            <p className="text-base font-semibold text-gray-900">
                                {appointmentType === 'presencial' || appointmentType === 'IN_PERSON' ? 'Presencial' : 'Telemedicina'}
                            </p>
                        </div>
                    )}

                    {clinicAddress && (
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Endereço:</p>
                            <p className="text-sm text-gray-800">{clinicAddress}</p>
                        </div>
                    )}

                    {clinicPhone && (
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Telefone:</p>
                            <p className="text-sm text-gray-800">{clinicPhone}</p>
                        </div>
                    )}
                </div>

                {/* QR Code Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 mx-6 mb-6 rounded-lg border-2 border-blue-200 p-5 flex flex-col items-center">
                    <p className="text-sm font-bold text-blue-900 mb-3">QR Code para Check-in</p>

                    <div className="bg-white p-3 rounded-lg shadow-md">
                        <img
                            src={qrCodeImage}
                            alt="QR Code para Check-in"
                            className="w-56 h-56"
                        />
                    </div>

                    <p className="text-xs text-gray-700 text-center mt-3 max-w-[280px] leading-relaxed">
                        Apresente este código na recepção para fazer check-in automaticamente
                    </p>
                </div>

                {/* Footer */}
                {clinicName && (
                    <div className="bg-gray-50 px-6 py-3 border-t">
                        <p className="text-center text-sm text-gray-600">{clinicName}</p>
                    </div>
                )}
            </div>
        )
    }
)

AppointmentVoucher.displayName = 'AppointmentVoucher'
