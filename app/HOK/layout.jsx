"use client";

import AuthGate from "@/components/auth/AuthGate";
import { BRAND, ENTRANCE_IMAGE, LOGIN_BG_VIDEO } from "@/components/hok/assets";
import * as hokTourPreload from "@/components/hok/tourAssetPreload";

export default function HOKLayout({ children }) {
  return (
    <AuthGate
      preloadTourAfterLogin
      tourPreload={hokTourPreload}
      entranceImage={ENTRANCE_IMAGE}
      showWhatsApp={false}
      loginBrand={{
        eyebrow: BRAND.loginEyebrow,
        title: BRAND.loginTitle,
        accent: BRAND.loginAccent,
        codePlaceholder: "e.g. HOK-VIP",
      }}
      welcomeProduct={BRAND.welcomeProduct}
      loginBackgroundVideo={LOGIN_BG_VIDEO}
    >
      {children}
    </AuthGate>
  );
}
