import Image from "next/image";
import Link from "next/link";


export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="
      text-white
      py-1 
      shadow-inner-xl
      text-xs 
      border border-black
    ">
      <div className="
        container mx-auto
        px-2
        flex flex-col items-center justify-between
        md:flex-row
        md:items-center
      ">

        {/* Brand/Logo Section */}
        <div className="mb-2 md:mb-0 md:w-1/3 text-center md:text-left">
            <h3 className="
              text-lg font-extrabold
              text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500
            ">
              Broflip
            </h3>
          <p className="text-xxs mt-0.5 text-"> {/* Assuming text-xxs is defined, otherwise use text-xs */}
            Decentralized Gaming
          </p>
        </div>

        {/* Social Media/Contact - Only icons remain */}
        <div className="md:w-1/3 text-center md:text-right">
          <div className="flex justify-center md:justify-end space-x-2"> {/* space-x-2 for spacing between icons */}
            <Link href="https://x.com/broflip_com" target="blank"><Image src="/icons8-x.svg" alt="X" width={40} height={40}/></Link>
        
          </div>
        </div>

      </div>

      {/* Copyright Section - No padding or margin */}
      <div className="
        border-t border-gray-700
        text-center text-[gray-300] text-xxs 
      ">
        &copy; {currentYear} Broflip. All rights reserved.
      </div>
    </footer>
  );
}