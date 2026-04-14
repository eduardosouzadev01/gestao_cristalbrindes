export const fixClientName = (name: string | undefined | null): string => {
    if (!name) return '';
    return name
        .replace(/Gr\uFFFDfica/g, 'Gráfica')
        .replace(/Gr.fica/g, 'Gráfica')
        .replace(/Farm\uFFFDcia/g, 'Farmácia')
        .replace(/Farm.cia/g, 'Farmácia')
        .replace(/M\uFFFDnica/g, 'Mônica')
        .replace(/M.nica/g, 'Mônica')
        .replace(/Es G\uFFFDs/g, 'Es Gás')
        .replace(/Es G.s/g, 'Es Gás')
        .replace(/\uFFFD/g, ''); // fallback
};
