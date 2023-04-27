/* SystemJS module definition */
declare let module: NodeModule;
interface NodeModule {
  filter(arg0: string, arg1: () => (input: any) => "yes" | "no"): unknown;
  id: string;
}
