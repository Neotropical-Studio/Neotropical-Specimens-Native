import NewShipmentForm from '../NewShipmentForm';

export default function NuevoEmbarquePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Nuevo embarque</h1>
      <NewShipmentForm />
    </div>
  );
}
