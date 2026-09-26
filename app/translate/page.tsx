import TranslatorWidget from '@/components/TranslatorWidget'
import LargeTitle from '@/components/LargeTitle'
import { t } from '@/lib/i18n'

/** Traduci. For now it hosts the existing widget; PR 5 rebuilds this screen. */
export default function TranslatePage() {
  return (
    <>
      <LargeTitle title={t('translate')} />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <TranslatorWidget />
      </div>
    </>
  )
}
