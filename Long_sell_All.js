function useHotkeyHandler() {
  const { useActiveSymbol, useActiveAccount, usePositions } = api.hooks;
  const [activeSymbol] = useActiveSymbol();
  const [activeAccount] = useActiveAccount();
  const positions = usePositions({ symbol: activeSymbol, account: activeAccount });

  return async () => {
    const pos = positions.find(p => p.symbol === activeSymbol && p.side.toLowerCase() === 'long');
    if (!pos) return api.toast.warning("No Long position found");

    try {
      await api.orders.closePosition(pos);
      api.toast.success("Full Long Closed");
    } catch (error) {
      api.toast.error(error.message);
    }
  };
}