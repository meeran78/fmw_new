import SellerShopGate from "@/components/SellerShopGate";

export default function MyShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SellerShopGate>{children}</SellerShopGate>;
}
