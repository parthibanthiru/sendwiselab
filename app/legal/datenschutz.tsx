import { LegalPage } from '@/components/LegalPage';
import { useT } from '@/lib/i18n';
import { PRIVACY_UPDATED } from '@/lib/legal';
import { formatDate } from '@/lib/format';

export default function DatenschutzScreen() {
  const t = useT();
  return (
    <LegalPage
      title={t.legal.privacyTitle}
      subtitle={t.legal.updated(formatDate(PRIVACY_UPDATED))}
      operatorHeading={t.legal.controllerHeading}
      sections={t.legal.privacySections}
    />
  );
}
