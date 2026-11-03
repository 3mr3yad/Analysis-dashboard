import { closePanel, useRoute } from "../state/router";
import Drawer from "../ui/Drawer";
import CustomerPanel from "./CustomerPanel";
import EmployeePanel from "./EmployeePanel";
import OrderPanel from "./OrderPanel";
import RequestPanel from "./RequestPanel";

/** One drawer for every record type, driven by the `panel` URL param (deep-linkable). */
export default function PanelHost() {
  const { panel } = useRoute();
  return (
    <Drawer open={!!panel} onClose={closePanel} label="تفاصيل السجل">
      {panel?.kind === "request" && <RequestPanel key={panel.id} id={panel.id} />}
      {panel?.kind === "employee" && <EmployeePanel key={panel.id} id={panel.id} />}
      {panel?.kind === "customer" && <CustomerPanel key={panel.id} id={panel.id} />}
      {panel?.kind === "order" && <OrderPanel key={panel.id} id={panel.id} />}
    </Drawer>
  );
}
