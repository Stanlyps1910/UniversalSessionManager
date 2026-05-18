import { getProvider, getModel } from '../utils/providers';

export default function SwitchDivider({ switchEvent }) {
  const provider = getProvider(switchEvent.to_provider);
  const providerName = provider ? provider.name : switchEvent.to_provider;
  const model = getModel(switchEvent.to_provider, switchEvent.to_model);
  const modelName = model ? model.label : switchEvent.to_model;

  return (
    <div className="switch-divider">
      Switched to {providerName} · {modelName}
    </div>
  );
}
