import { VamanaBoardGrid, type VamanaBoardGridProps } from "./VamanaBoardGrid";
import { useFitBox } from "./useFitBox";

const HORIZONTAL_ASPECT = 7 / 2;
const VERTICAL_ASPECT = 2 / 7;

/** The board, drawn as large as the space around it allows while keeping its shape. */
export function VamanaFitBoard(props: Omit<VamanaBoardGridProps, "size" | "className">) {
  const { ref, size } = useFitBox(props.orientation === "horizontal" ? HORIZONTAL_ASPECT : VERTICAL_ASPECT);
  return (
    <div ref={ref} className="flex h-full min-h-0 w-full min-w-0 items-center justify-center">
      <VamanaBoardGrid {...props} size={size} />
    </div>
  );
}
