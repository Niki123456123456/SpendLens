import { useTranslation } from '../i18n';
import { Body, Screen, Title } from '../components/ui';
export default function AuthReturn() {
  const { t } = useTranslation();
  return <Screen><Title>{t('Anmeldung abgeschlossen')}</Title><Body>{t('Du kannst dieses Fenster schließen und zu SpendLens zurückkehren.')}</Body></Screen>;
}
