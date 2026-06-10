#!/bin/bash
# Remove last 3 lines
sed -i '' -e '$ d' components/shared/claim-shop-modal.tsx
sed -i '' -e '$ d' components/shared/claim-shop-modal.tsx
sed -i '' -e '$ d' components/shared/claim-shop-modal.tsx

# Add proper endings
echo "    </AnimatePresence>" >> components/shared/claim-shop-modal.tsx
echo "  );" >> components/shared/claim-shop-modal.tsx
echo "}" >> components/shared/claim-shop-modal.tsx
