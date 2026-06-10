#!/bin/bash
sed -i '' '/<\/AnimatePresence>/q' components/shared/claim-shop-modal.tsx
echo "  );" >> components/shared/claim-shop-modal.tsx
echo "}" >> components/shared/claim-shop-modal.tsx
