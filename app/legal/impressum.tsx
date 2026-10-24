import { LegalPage } from '@/components/LegalPage';
import { useT } from '@/lib/i18n';

export default function ImpressumScreen() {
  const t = useT();
  return <LegalPage title={t.legal.impressum} operatorHeading={t.legal.operatorHeading} sections={t.legal.impressumSections} />;
}
