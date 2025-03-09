import { access, readFile, writeFile } from 'fs/promises';

async function main() {
	try {
		await access('instrukce.txt');
	} catch (err) {
		console.error('Súbor instrukce.txt neexistuje!');
		return;
	}

	try {
		const data = await readFile('instrukce.txt', 'utf8');
		const pocet = parseInt(data.trim());

		if (isNaN(pocet)) {
			console.error('V súbore nie je číslo!');
			return;
		}

		console.log(`Idem vytvoriť ${pocet + 1} súborov...`);

		const promises = [];

		// POZNÁMKA: 
		// Zo zadania nie je jasné, či pre vstup n=3 má vzniknúť n+1 (teda 4) alebo n (teda 3) súborov.
		// Zadanie hovorí "vytvoří n souborů" ale zároveň "s názvy 0.txt, 1.txt, 2.txt až n.txt", čo ale osobne chápem ako n+1 súborov.
		// Aktuálne vytváranie n+1 súborov s indexami 0 až n. Pre vytvorenie presne n súborov by stačilo zmeniť <= na <.
		for (let i = 0; i <= pocet; i++) {
			promises.push(writeFile(`${i}.txt`, `Soubor ${i}`));
		}

		await Promise.all(promises);

		console.log('Hotovo! Všetky súbory boli vytvorené.');
	} catch (err) {
		console.error('Chyba:', err);
	}
}

main();