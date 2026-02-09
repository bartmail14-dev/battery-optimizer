import { View, Text } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles } from '../styles';

export function createHeader(pageTitle: string, pageNum: number, totalPages: number) {
  return createElement(View, { style: styles.header },
    createElement(View, null,
      createElement(Text, { style: styles.brandName }, 'COMCAM'),
      createElement(Text, { style: styles.brandSub }, 'Energieconsultancy \u2014 Battery Optimizer'),
    ),
    createElement(View, { style: { alignItems: 'flex-end' } },
      createElement(Text, { style: styles.pageNumber }, `${pageTitle}`),
      createElement(Text, { style: styles.pageNumber }, `Pagina ${pageNum} van ${totalPages}`),
    ),
  );
}
