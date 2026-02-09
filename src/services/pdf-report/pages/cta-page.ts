import { Page, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { styles } from '../styles';

export function createCtaPage() {
  return createElement(Page, { size: 'A4', style: { ...styles.page, ...styles.ctaPage } },
    createElement(Text, { style: styles.ctaTitle }, 'Klaar voor de volgende stap?'),
    createElement(Text, { style: styles.ctaText },
      'Deze analyse geeft een eerste indicatie van het potentieel van batterijopslag voor uw organisatie.'
    ),
    createElement(Text, { style: styles.ctaText },
      'COMCAM helpt u graag verder met een maatwerkadvies, inclusief:'
    ),
    createElement(Text, { style: { ...styles.ctaText, textAlign: 'left', marginLeft: 60 } },
      '\u2022 Gedetailleerde analyse op basis van uw werkelijke verbruiksdata\n' +
      '\u2022 Leveranciersselectie en offertevergelijking\n' +
      '\u2022 Subsidieaanvraag (SDE++, EIA)\n' +
      '\u2022 Projectbegeleiding van ontwerp tot oplevering'
    ),
    createElement(View, { style: styles.ctaContact },
      createElement(Text, { style: { fontSize: 14, fontWeight: 'bold', color: '#2563eb', marginBottom: 8 } }, 'COMCAM Energieconsultancy'),
      createElement(Text, { style: styles.ctaText }, 'info@comcam.nl'),
      createElement(Text, { style: styles.ctaText }, 'www.comcam.nl'),
    ),
  );
}
