import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'

export const GET = withAxiom(async (req: AxiomRequest) => {
  req.log.error('teste de alerta', { origem: 'test-log' })
  return Response.json({ ok: true })
})
