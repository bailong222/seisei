import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

// Define the props for our reusable Modal component
interface ModalProps {
  isOpen: boolean; // Controls whether the modal is open or closed
  onClose: () => void; // Function to call when the modal needs to be closed
  title?: string; // Optional title for the modal
  children: React.ReactNode; // The content to be rendered inside the modal
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <Dialog open={isOpen} as="div" className="relative z-50" onClose={onClose}>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Modal container */}
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-md rounded-xl bg-black/40 p-6 backdrop-blur-2xl duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
          >
            {title && ( // Conditionally render the title if provided
              <DialogTitle as="h3" className="text-base/7 font-medium text-white">
                {title}
              </DialogTitle>
            )}

            {children} {/* This is where your custom content will go */}

            {/* Close button inside the modal, if you want a default one */}
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                onClick={onClose}
              >
                Got it, thanks!
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
