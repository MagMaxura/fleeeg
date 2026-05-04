import React, { useContext } from 'react';
import { AppContext } from '../../AppContext.ts';
import { Card, Button } from '../ui.tsx';

type LegalViewProps = {
  type: 'privacy' | 'terms';
};

const updatedAt = '4 de mayo de 2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
    <div className="space-y-3 text-slate-300 leading-relaxed">{children}</div>
  </section>
);

const PrivacyPolicy = () => (
  <>
    <Section title="1. Responsable del tratamiento">
      <p>
        Fletapp es una plataforma que conecta clientes con fleteros para solicitar, coordinar y pagar servicios de
        flete. Para consultas sobre privacidad, podés escribirnos desde los canales de contacto disponibles en la app.
      </p>
    </Section>
    <Section title="2. Datos que recopilamos">
      <p>
        Podemos recopilar datos de cuenta y contacto, como nombre, correo electrónico, teléfono, DNI, domicilio,
        ciudad y provincia. En el caso de fleteros, también podemos solicitar datos del vehículo, capacidad de carga,
        documentación de identidad, licencia de conducir, fotos del vehículo y datos para liquidaciones.
      </p>
      <p>
        También tratamos información operativa necesaria para prestar el servicio: origen y destino de viajes,
        detalles de carga, fotos de la carga, ofertas, mensajes, reseñas, pagos, solicitudes de cobro, notificaciones
        y ubicación aproximada o en tiempo real cuando el usuario la autoriza.
      </p>
    </Section>
    <Section title="3. Finalidades">
      <p>
        Usamos los datos para registrar usuarios, validar perfiles, publicar solicitudes de flete, permitir ofertas,
        calcular rutas y precios estimados, coordinar viajes, procesar pagos, administrar liquidaciones, enviar
        notificaciones, mejorar la seguridad y mantener soporte operativo.
      </p>
    </Section>
    <Section title="4. Ubicación y mapas">
      <p>
        Cuando habilitás permisos de ubicación, la app puede usar tu posición para mejorar la experiencia, calcular
        rutas, mostrar conductores disponibles o permitir seguimiento durante un viaje. Podés revocar el permiso desde
        la configuración del navegador o dispositivo.
      </p>
    </Section>
    <Section title="5. Servicios de terceros">
      <p>
        Fletapp utiliza proveedores externos para operar funciones esenciales, incluyendo Supabase para autenticación,
        base de datos, almacenamiento y funciones backend; Google Maps Platform para mapas, direcciones, lugares y
        rutas; y Mercado Pago para procesamiento de pagos.
      </p>
    </Section>
    <Section title="6. Conservación y seguridad">
      <p>
        Conservamos la información mientras sea necesaria para prestar el servicio, cumplir obligaciones legales,
        resolver disputas, prevenir fraude o mantener registros operativos. Aplicamos controles técnicos y reglas de
        acceso para reducir riesgos, aunque ningún sistema conectado a internet puede garantizar seguridad absoluta.
      </p>
    </Section>
    <Section title="7. Derechos del usuario">
      <p>
        Podés solicitar acceso, actualización, rectificación o eliminación de tus datos cuando corresponda. Algunas
        solicitudes pueden requerir conservar información mínima por motivos legales, contables, antifraude o de
        seguridad de la plataforma.
      </p>
    </Section>
    <Section title="8. Cambios en esta política">
      <p>
        Podemos actualizar esta política para reflejar cambios legales, técnicos u operativos. La versión vigente se
        publica en esta página con su fecha de actualización.
      </p>
    </Section>
  </>
);

const TermsOfService = () => (
  <>
    <Section title="1. Alcance del servicio">
      <p>
        Fletapp es una plataforma tecnológica que facilita el contacto entre clientes que necesitan realizar fletes y
        fleteros que ofrecen servicios de transporte. La app no reemplaza las obligaciones legales, comerciales,
        fiscales, laborales, de tránsito o de seguro que correspondan a cada usuario.
      </p>
    </Section>
    <Section title="2. Registro y veracidad de datos">
      <p>
        Para usar la plataforma, el usuario debe brindar información real, actualizada y completa. Los fleteros deben
        mantener vigente su documentación personal, licencia, datos del vehículo y datos de cobro. Fletapp puede limitar
        o suspender cuentas ante datos falsos, uso indebido o riesgo para otros usuarios.
      </p>
    </Section>
    <Section title="3. Solicitudes, ofertas y viajes">
      <p>
        El cliente es responsable de describir correctamente la carga, origen, destino, volumen, peso, fotos, necesidad
        de ayuda y cualquier condición relevante. El fletero es responsable de evaluar si puede realizar el servicio,
        enviar una oferta adecuada y cumplir el viaje aceptado.
      </p>
      <p>
        Los precios calculados por la app pueden ser estimativos y pueden ajustarse por condiciones reales del servicio,
        siempre que el flujo de la plataforma lo permita y las partes lo acepten.
      </p>
    </Section>
    <Section title="4. Pagos y liquidaciones">
      <p>
        Los pagos pueden procesarse mediante Mercado Pago u otros medios habilitados. La aprobación, rechazo, devolución
        o demora de pagos puede depender de proveedores externos. Las liquidaciones a fleteros se gestionan según la
        información de cobro declarada y el estado de cada viaje.
      </p>
    </Section>
    <Section title="5. Conducta de usuarios">
      <p>
        No se permite usar la plataforma para actividades ilegales, cargas prohibidas, fraude, suplantación de identidad,
        hostigamiento, manipulación de pagos, daño a sistemas o cualquier acción que afecte la seguridad de usuarios o
        de la app.
      </p>
    </Section>
    <Section title="6. Responsabilidades">
      <p>
        Cada usuario responde por sus actos, información, documentación, cumplimiento normativo y ejecución del servicio
        que solicita u ofrece. Fletapp puede facilitar herramientas de coordinación, seguimiento, pagos y comunicación,
        pero no garantiza disponibilidad continua ni resultado específico en todos los casos.
      </p>
    </Section>
    <Section title="7. Suspensión o baja">
      <p>
        Fletapp puede suspender, limitar o cancelar cuentas por incumplimiento de estas condiciones, sospecha de fraude,
        problemas de seguridad, reclamos graves, documentación inválida o requerimientos legales.
      </p>
    </Section>
    <Section title="8. Cambios en las condiciones">
      <p>
        Podemos modificar estas condiciones por cambios operativos, técnicos, comerciales o legales. La versión vigente
        se publica en esta página con su fecha de actualización.
      </p>
    </Section>
  </>
);

const LegalView: React.FC<LegalViewProps> = ({ type }) => {
  const context = useContext(AppContext);
  const isPrivacy = type === 'privacy';

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl animate-fadeSlideIn">
      <div className="mb-8">
        <p className="text-amber-400 text-sm font-bold uppercase tracking-wider mb-3">Fletapp</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-100">
          {isPrivacy ? 'Política de Privacidad' : 'Condiciones del Servicio'}
        </h1>
        <p className="text-slate-400 mt-3">Última actualización: {updatedAt}</p>
      </div>

      <Card className="space-y-10">
        {isPrivacy ? <PrivacyPolicy /> : <TermsOfService />}
      </Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => context?.setView(context.user ? 'dashboard' : 'landing')}>
          Volver a Fletapp
        </Button>
        <a className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center px-4" href={isPrivacy ? '/condiciones' : '/privacidad'}>
          Ver {isPrivacy ? 'Condiciones del Servicio' : 'Política de Privacidad'}
        </a>
      </div>
    </div>
  );
};

export default LegalView;
