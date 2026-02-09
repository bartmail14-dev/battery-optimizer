import { Text } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles } from '../styles';

export function createFooter(reportDate: string) {
  return createElement(Text, { style: styles.footer },
    `Battery Optimizer \u2014 COMCAM Energieconsultancy \u2014 ${reportDate} \u2014 Vertrouwelijk`
  );
}
