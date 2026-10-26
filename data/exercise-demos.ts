/**
 * Exemplos visuais de execução.
 *
 * Fonte: free-exercise-db (https://github.com/yuhonas/free-exercise-db), dataset
 * em domínio público (Unlicense). As fotos foram copiadas para /public/exercise-media
 * para que o app não dependa de serviços externos e funcione offline.
 * Os passos abaixo são uma adaptação em português das instruções originais.
 */

export interface ExerciseDemo {
  /** Mesmo id do dataset de origem (também é o nome da pasta das imagens). */
  id: string;
  /** Nome em português. */
  name: string;
  /** Nome original no dataset. */
  sourceName: string;
  /** Duas fotos: posição inicial e posição final. */
  images: [string, string];
  steps: string[];
}

export const DEMO_CREDIT = "Fotos e instruções adaptadas de free-exercise-db (domínio público).";

function demo(id: string, name: string, sourceName: string, steps: string[]): ExerciseDemo {
  return { id, name, sourceName, images: [`/exercise-media/${id}/0.jpg`, `/exercise-media/${id}/1.jpg`], steps };
}

export const EXERCISE_DEMOS: ExerciseDemo[] = [
  demo("Barbell_Bench_Press_-_Medium_Grip", "Supino reto com barra", "Barbell Bench Press - Medium Grip", [
    "Deite no banco reto, pés firmes no chão. Pegada média: antebraços verticais no meio do movimento.",
    "Retire a barra do suporte e segure-a acima do peito com os braços estendidos.",
    "Inspire e desça a barra devagar até tocar o meio do peito.",
    "Após breve pausa, empurre de volta expirando, focando no peito. A descida deve levar cerca do dobro do tempo da subida.",
  ]),
  demo("Incline_Dumbbell_Press", "Supino inclinado com halteres", "Incline Dumbbell Press", [
    "Deite no banco inclinado (30–45°) com um halter em cada coxa, palmas voltadas uma para a outra.",
    "Use as coxas para ajudar a levar os halteres à altura dos ombros e gire os punhos com as palmas para a frente.",
    "Expire e empurre os halteres para cima com o peito até estender os braços.",
    "Desça devagar, controlando, até os cotovelos ficarem levemente abaixo da linha dos ombros.",
  ]),
  demo("Leverage_Incline_Chest_Press", "Supino inclinado na máquina", "Leverage Incline Chest Press", [
    "Ajuste o assento para que as manoplas fiquem na altura do peito superior. Peito aberto e escápulas retraídas.",
    "Empurre as manoplas à frente estendendo os cotovelos.",
    "Pause brevemente e retorne até logo acima da posição inicial, sem apoiar o peso nos batentes até terminar a série.",
  ]),
  demo("Dumbbell_Bench_Press", "Supino reto com halteres", "Dumbbell Bench Press", [
    "Deite no banco reto com um halter em cada coxa e use as pernas para levá-los à altura dos ombros.",
    "Gire os punhos com as palmas para a frente; halteres ao lado do peito, cotovelos a 90°.",
    "Expire e empurre com o peito até estender os braços, contraindo no topo por um segundo.",
    "Desça devagar até a posição inicial. A descida deve ser mais lenta que a subida.",
  ]),
  demo("Butterfly", "Crucifixo na máquina (peck deck)", "Butterfly", [
    "Sente com as costas apoiadas e ajuste a máquina para que os braços fiquem paralelos ao chão.",
    "Segure as manoplas e aproxime-as lentamente à frente, apertando o peito e expirando.",
    "Segure a contração por um segundo e volte devagar até sentir o peito alongar.",
  ]),
  demo("Cable_Crossover", "Crossover na polia", "Cable Crossover", [
    "Posicione as polias no alto, segure uma manopla em cada mão e dê um passo à frente com leve inclinação do tronco.",
    "Com os cotovelos levemente flexionados, abra os braços em arco amplo até sentir o peito alongar, inspirando.",
    "Retorne pelo mesmo arco, expirando, até as mãos se encontrarem à frente do peito. O movimento acontece só no ombro.",
  ]),
  demo("Pushups", "Flexão de braços", "Pushups", [
    "Apoie as mãos no chão um pouco além da largura dos ombros, corpo alinhado da cabeça aos calcanhares.",
    "Desça inspirando até o peito quase tocar o chão.",
    "Expire e empurre de volta à posição inicial, contraindo o peito.",
  ]),
  demo("Dips_-_Chest_Version", "Mergulho nas paralelas", "Dips - Chest Version", [
    "Segure-se nas paralelas com os braços estendidos e o corpo suspenso.",
    "Desça devagar inspirando, inclinando o tronco cerca de 30° à frente e com os cotovelos levemente abertos, até sentir o peito alongar.",
    "Empurre de volta com o peito, expirando, e aperte o peito no topo por um segundo.",
  ]),
  demo("Machine_Shoulder_Military_Press", "Desenvolvimento de ombros na máquina", "Machine Shoulder (Military) Press", [
    "Sente na máquina e segure as manoplas ao lado da cabeça, cotovelos flexionados e alinhados ao tronco.",
    "Expire e empurre as manoplas para cima até estender os braços, segurando um segundo no topo.",
    "Desça devagar inspirando até a posição inicial.",
  ]),
  demo("Dumbbell_Shoulder_Press", "Desenvolvimento com halteres", "Dumbbell Shoulder Press", [
    "Sente em um banco com encosto, com os halteres apoiados nas coxas, e leve-os à altura dos ombros.",
    "Gire os punhos com as palmas para a frente. Essa é a posição inicial.",
    "Expire e empurre os halteres para cima até quase se tocarem acima da cabeça.",
    "Pause e desça devagar até a altura dos ombros, inspirando.",
  ]),
  demo("Side_Lateral_Raise", "Elevação lateral", "Side Lateral Raise", [
    "Em pé, tronco firme, halteres ao lado do corpo com as palmas voltadas para você.",
    "Sem balançar, eleve os halteres lateralmente com os cotovelos levemente flexionados, como se despejasse água de uma jarra, até os braços ficarem paralelos ao chão.",
    "Pause um segundo no topo e desça devagar inspirando.",
  ]),
  demo("Cable_Seated_Lateral_Raise", "Elevação lateral na polia", "Cable Seated Lateral Raise", [
    "Use a polia baixa. A foto mostra a versão sentada e cruzada; em pé, segure a manopla da polia com a mão oposta, cabo passando à frente do corpo.",
    "Com o cotovelo levemente flexionado e fixo, eleve o braço lateralmente até a altura do ombro, expirando.",
    "Segure a contração um segundo e desça devagar, resistindo ao cabo. Repita do outro lado.",
  ]),
  demo("Front_Dumbbell_Raise", "Elevação frontal", "Front Dumbbell Raise", [
    "Em pé, halteres à frente das coxas, palmas voltadas para o corpo.",
    "Sem balançar o tronco, eleve um halter à frente com o cotovelo levemente flexionado até um pouco acima da linha do ombro, expirando.",
    "Desça devagar enquanto eleva o outro braço, alternando até completar as repetições de cada lado.",
  ]),
  demo("Reverse_Machine_Flyes", "Crucifixo inverso na máquina", "Reverse Machine Flyes", [
    "Ajuste o assento para que as manoplas fiquem na altura dos ombros e posicione-as totalmente à frente. Segure com as palmas voltadas para dentro.",
    "Em movimento semicircular, leve as mãos para os lados e para trás, contraindo o deltoide posterior.",
    "Mantenha os cotovelos levemente flexionados; todo o movimento ocorre no ombro. Pause atrás e volte devagar.",
  ]),
  demo("Face_Pull", "Face pull na polia", "Face Pull", [
    "De frente para a polia alta com a corda presa, segure as pontas com as palmas voltadas uma para a outra.",
    "Puxe a corda em direção ao rosto, separando as mãos e mantendo os braços paralelos ao chão.",
    "Aperte as escápulas no final, pause e volte controlando.",
  ]),
  demo("Wide-Grip_Lat_Pulldown", "Puxada alta na frente", "Wide-Grip Lat Pulldown", [
    "Sente na máquina, ajuste o apoio dos joelhos e segure a barra com pegada pronada mais larga que os ombros.",
    "Incline o tronco cerca de 30° para trás, peito aberto. Essa é a posição inicial.",
    "Expire e puxe a barra até o peito superior, levando ombros e cotovelos para baixo e para trás. O tronco não se move.",
    "Aperte as costas por um segundo e volte devagar até os braços estenderem e o dorsal alongar.",
  ]),
  demo("V-Bar_Pulldown", "Puxada neutra", "V-Bar Pulldown", [
    "Sente na máquina com o triângulo preso à polia alta e segure com as palmas voltadas uma para a outra.",
    "Peito aberto e leve inclinação do tronco para trás (cerca de 30°).",
    "Puxe o triângulo até quase tocar o peito, apertando as escápulas e expirando; o tronco fica parado.",
    "Segure um segundo e volte devagar inspirando.",
  ]),
  demo("Pullups", "Barra fixa", "Pullups", [
    "Segure a barra com pegada pronada na largura escolhida e deixe o corpo suspenso com os braços estendidos.",
    "Incline levemente o tronco para trás e abra o peito. Essa é a posição inicial.",
    "Puxe o corpo para cima até a barra chegar ao peito superior, levando os cotovelos para baixo e para trás, expirando.",
    "Pause um segundo e desça devagar até estender completamente os braços.",
  ]),
  demo("Leverage_Iso_Row", "Remada com apoio no peito", "Leverage Iso Row", [
    "Ajuste o assento para que as manoplas fiquem na altura do peito e apoie o peito firme no suporte. Pegada neutra ou pronada.",
    "Puxe as manoplas em direção ao tronco, retraindo as escápulas enquanto flexiona os cotovelos.",
    "Pause no final e volte devagar, sem apoiar o peso nos batentes entre as repetições.",
  ]),
  demo("Seated_One-arm_Cable_Pulley_Rows", "Remada unilateral na polia", "Seated One-arm Cable Pulley Rows", [
    "Sente na máquina de remada baixa com os pés apoiados e os joelhos levemente flexionados. Segure a manopla única com uma mão.",
    "Tronco a 90° das pernas, costas neutras e peito aberto; sinta o dorsal alongar com o braço estendido.",
    "Puxe a manopla até o abdômen mantendo o braço junto ao corpo e girando o punho para a posição neutra, expirando. Aperte as costas.",
    "Volte devagar inspirando. Complete as repetições e repita com o outro braço.",
  ]),
  demo("Seated_Cable_Rows", "Remada baixa na polia", "Seated Cable Rows", [
    "Sente na máquina com os pés apoiados, joelhos levemente flexionados, e segure o triângulo com pegada neutra.",
    "Tronco a 90° das pernas, peito aberto e costas neutras; braços estendidos sentindo o dorsal alongar.",
    "Puxe o triângulo até o abdômen mantendo os braços junto ao corpo e o tronco parado, expirando. Aperte as costas um segundo.",
    "Volte devagar inspirando.",
  ]),
  demo("Bent_Over_Barbell_Row", "Remada curvada com barra", "Bent Over Barbell Row", [
    "Segure a barra com pegada pronada, flexione levemente os joelhos e incline o tronco à frente até quase paralelo ao chão, costas retas e cabeça alinhada.",
    "Com o tronco parado, expire e puxe a barra em direção ao abdômen, cotovelos junto ao corpo.",
    "Aperte as costas no topo, pause e desça devagar inspirando.",
  ]),
  demo("T-Bar_Row_with_Handle", "Remada cavalinho (T-bar)", "T-Bar Row with Handle", [
    "Posicione-se sobre a barra com a pegada dupla junto à anilha. Pés afastados, quadril para trás e peito aberto.",
    "Puxe o peso até a parte superior do abdômen retraindo as escápulas e flexionando os cotovelos, sem usar impulso.",
    "Pause brevemente e volte à posição inicial com os braços estendidos.",
  ]),
  demo("Straight-Arm_Pulldown", "Pulldown com braços estendidos", "Straight-Arm Pulldown", [
    "Segure a barra da polia alta com pegada pronada um pouco além dos ombros e afaste-se um ou dois passos.",
    "Incline o tronco cerca de 30° à frente, braços estendidos com leve flexão dos cotovelos, dorsal ativado.",
    "Mantendo os braços retos, puxe a barra até as coxas contraindo o dorsal, expirando.",
    "Volte devagar até a posição inicial, inspirando.",
  ]),
  demo("Dumbbell_Shrug", "Encolhimento com halteres", "Dumbbell Shrug", [
    "Em pé, halteres ao lado do corpo com as palmas voltadas para o tronco, braços estendidos.",
    "Eleve os ombros o mais alto possível expirando e segure um segundo no topo. Os braços permanecem estendidos.",
    "Desça devagar até a posição inicial.",
  ]),
  demo("EZ-Bar_Curl", "Rosca direta com barra EZ", "EZ-Bar Curl", [
    "Em pé, segure a barra EZ na pegada externa, palmas para a frente levemente inclinadas, cotovelos junto ao tronco.",
    "Mantendo os braços fixos, expire e flexione os cotovelos até a barra chegar à altura dos ombros. Só os antebraços se movem.",
    "Aperte o bíceps no topo e desça devagar inspirando.",
  ]),
  demo("Incline_Dumbbell_Curl", "Rosca inclinada com halteres", "Incline Dumbbell Curl", [
    "Sente em banco inclinado com um halter em cada mão, braços estendidos para baixo e palmas voltadas para a frente.",
    "Com o braço fixo, flexione os cotovelos até os halteres chegarem aos ombros, expirando. Só os antebraços se movem.",
    "Segure um segundo e desça devagar, alongando completamente.",
  ]),
  demo("Machine_Preacher_Curls", "Rosca Scott", "Machine Preacher Curls", [
    "Sente na máquina, apoie a parte de trás dos braços no suporte e segure as manoplas com as palmas para cima, cotovelos para dentro.",
    "Expire e flexione os cotovelos contraindo o bíceps; os braços permanecem apoiados o tempo todo.",
    "Segure um segundo no topo e desça devagar inspirando.",
  ]),
  demo("Hammer_Curls", "Rosca martelo", "Hammer Curls", [
    "Em pé, tronco ereto, halteres ao lado do corpo com as palmas voltadas para o tronco e cotovelos junto ao corpo.",
    "Com o braço fixo, expire e flexione o cotovelo mantendo a pegada neutra até o halter chegar ao ombro.",
    "Aperte o bíceps brevemente e desça devagar inspirando.",
  ]),
  demo("Triceps_Pushdown_-_Rope_Attachment", "Tríceps na polia com corda", "Triceps Pushdown - Rope Attachment", [
    "Prenda a corda na polia alta e segure com pegada neutra. Tronco ereto com leve inclinação à frente, braços junto ao corpo.",
    "Usando o tríceps, empurre a corda para baixo abrindo as pontas ao lado das coxas até estender os braços, expirando. Só os antebraços se movem.",
    "Segure um segundo e volte devagar até a posição inicial, inspirando.",
  ]),
  demo("Triceps_Overhead_Extension_with_Rope", "Tríceps acima da cabeça na polia", "Triceps Overhead Extension with Rope", [
    "Prenda a corda na polia baixa, segure com as duas mãos e fique de costas para a máquina com as mãos atrás da cabeça e cotovelos apontando para cima.",
    "Afaste um pé à frente e incline-se levemente para longe da máquina para estabilizar.",
    "Estenda os cotovelos mantendo os braços fixos, levando as mãos acima da cabeça. Aperte o tríceps no topo.",
    "Desça devagar até a posição inicial.",
  ]),
  demo("EZ-Bar_Skullcrusher", "Tríceps testa", "EZ-Bar Skullcrusher", [
    "Deitado no banco, segure a barra EZ com pegada fechada e braços perpendiculares ao chão, cotovelos para dentro.",
    "Com os braços fixos, flexione os cotovelos descendo a barra até logo acima da testa, inspirando.",
    "Estenda os cotovelos de volta à posição inicial, expirando.",
  ]),
  demo("Standing_Dumbbell_Triceps_Extension", "Tríceps francês com halter", "Standing Dumbbell Triceps Extension", [
    "Em pé, pés na largura dos ombros, segure um halter com as duas mãos acima da cabeça, braços estendidos e palmas voltadas para cima.",
    "Mantendo os braços junto à cabeça e os cotovelos apontados para a frente, desça o halter atrás da cabeça em semicírculo, inspirando.",
    "Use o tríceps para voltar à posição inicial, expirando.",
  ]),
  demo("Barbell_Squat", "Agachamento livre", "Barbell Squat", [
    "Posicione a barra no rack logo abaixo da altura dos ombros, apoie-a nas costas (trapézio) e retire-a estendendo as pernas.",
    "Afaste-se do rack com os pés na largura dos ombros e pontas levemente para fora, cabeça alinhada e costas retas.",
    "Desça devagar flexionando joelhos e quadril, inspirando, até as coxas ficarem pelo menos paralelas ao chão. Joelhos acompanham a direção dos pés.",
    "Suba expirando, empurrando o chão com todo o pé, até a posição inicial.",
  ]),
  demo("Hack_Squat", "Hack squat", "Hack Squat", [
    "Apoie as costas e os ombros nos suportes da máquina e posicione os pés na plataforma na largura dos ombros, pontas levemente para fora.",
    "Destrave a segurança e estenda as pernas sem travar os joelhos. Essa é a posição inicial.",
    "Desça devagar flexionando os joelhos, costas sempre apoiadas, até as coxas ficarem abaixo do paralelo, inspirando.",
    "Suba expirando, empurrando com todo o pé, até a posição inicial.",
  ]),
  demo("Leg_Press", "Leg press", "Leg Press", [
    "Sente na máquina e posicione os pés na plataforma na largura dos ombros.",
    "Destrave a segurança e estenda as pernas sem travar os joelhos. Tronco e pernas formam cerca de 90°.",
    "Inspire e desça a plataforma devagar até os joelhos formarem cerca de 90°, sem deixar o quadril descolar do assento.",
    "Empurre de volta com todo o pé, expirando. Trave a segurança ao terminar.",
  ]),
  demo("Leg_Extensions", "Cadeira extensora", "Leg Extensions", [
    "Sente na máquina com o rolo sobre a parte inferior da canela, logo acima dos pés, e o eixo alinhado ao joelho. Segure as laterais.",
    "Estenda as pernas ao máximo usando o quadríceps, expirando, e pause um segundo no topo.",
    "Desça devagar inspirando, sem passar de 90° de flexão do joelho.",
  ]),
  demo("Dumbbell_Lunges", "Afundo com halteres", "Dumbbell Lunges", [
    "Em pé, tronco ereto, segure um halter em cada mão ao lado do corpo.",
    "Dê um passo à frente e desça o corpo mantendo o tronco ereto e a canela da frente vertical, inspirando. O joelho não passa muito da ponta do pé.",
    "Empurre com o calcanhar da frente e volte à posição inicial, expirando. Complete as repetições e troque a perna.",
  ]),
  demo("Split_Squat_with_Dumbbells", "Agachamento búlgaro", "Split Squat with Dumbbells", [
    "Posicione-se em passada com o pé de trás apoiado em um banco e o pé da frente à frente do corpo.",
    "Segure um halter em cada mão ao lado do corpo. Essa é a posição inicial.",
    "Desça flexionando joelho e quadril da perna da frente, mantendo a postura e o joelho alinhado com o pé.",
    "No fundo, empurre com o calcanhar da frente para voltar à posição inicial.",
  ]),
  demo("Lying_Leg_Curls", "Mesa flexora", "Lying Leg Curls", [
    "Ajuste o rolo para ficar logo acima dos calcanhares e deite de bruços com as pernas estendidas, segurando as alças.",
    "Expire e flexione os joelhos o máximo possível sem levantar o quadril do banco. Segure um segundo na contração.",
    "Volte devagar inspirando até as pernas estenderem.",
  ]),
  demo("Seated_Leg_Curl", "Cadeira flexora", "Seated Leg Curl", [
    "Ajuste a máquina, sente com as costas apoiadas e o rolo logo acima dos calcanhares; trave o apoio das coxas.",
    "Segure as alças e, expirando, flexione os joelhos puxando o rolo para trás o máximo possível, tronco parado.",
    "Segure um segundo e volte devagar inspirando.",
  ]),
  demo("Romanian_Deadlift", "Levantamento terra romeno", "Romanian Deadlift", [
    "Segure a barra com pegada pronada um pouco além dos ombros, joelhos levemente flexionados, canelas verticais e costas retas.",
    "Com costas e braços firmes, suba a barra estendendo o quadril, expirando, até ficar em pé.",
    "Desça empurrando o quadril para trás com leve flexão dos joelhos, barra rente às coxas, até sentir os posteriores alongarem.",
    "Mantenha o peito aberto durante todo o movimento; controle a descida.",
  ]),
  demo("Stiff-Legged_Dumbbell_Deadlift", "Stiff com halteres", "Stiff-Legged Dumbbell Deadlift", [
    "Em pé, halteres à frente das coxas, pés na largura dos ombros ou mais juntos, joelhos levemente flexionados.",
    "Mantendo os joelhos fixos e as costas retas, desça os halteres pela frente das pernas inclinando o tronco até sentir os posteriores alongarem.",
    "Suba estendendo o quadril até a posição inicial.",
  ]),
  demo("Barbell_Hip_Thrust", "Hip thrust", "Barbell Hip Thrust", [
    "Sente no chão com um banco atrás e a barra (com protetor) sobre o quadril. Apoie a parte superior das costas na borda do banco.",
    "Empurre o chão com os pés e estenda o quadril para cima, sustentando o peso nas escápulas e nos pés.",
    "No topo, joelhos a 90° e quadril totalmente estendido; queixo baixo. Desça controlando e repita.",
  ]),
  demo("One-Legged_Cable_Kickback", "Extensão de quadril na polia", "One-Legged Cable Kickback", [
    "Prenda a tornozeleira na polia baixa, fique de frente para a máquina e segure a estrutura para apoio.",
    "Com joelhos e quadril levemente flexionados e abdômen firme, contraia o glúteo e leve a perna para trás em arco, expirando.",
    "Aperte o glúteo na extensão máxima por um segundo, sem hiperestender a lombar, e volte devagar resistindo ao cabo. Troque a perna.",
  ]),
  demo("Barbell_Glute_Bridge", "Elevação pélvica", "Barbell Glute Bridge", [
    "Deite no chão com a barra (com protetor) sobre o quadril e os pés apoiados próximos aos glúteos.",
    "Empurre os calcanhares no chão e estenda o quadril para cima, sustentando o peso na parte superior das costas e nos pés.",
    "Estenda ao máximo, aperte os glúteos e volte controlando.",
  ]),
  demo("Standing_Calf_Raises", "Panturrilha em pé", "Standing Calf Raises", [
    "Ajuste a máquina, apoie os ombros sob as almofadas e posicione a ponta dos pés na plataforma com os calcanhares para fora.",
    "Estenda quadril e joelhos para ficar ereto, joelhos levemente flexionados e fixos.",
    "Eleve os calcanhares o mais alto possível, expirando, e segure um segundo no topo.",
    "Desça devagar inspirando até sentir a panturrilha alongar.",
  ]),
  demo("Seated_Calf_Raise", "Panturrilha sentada", "Seated Calf Raise", [
    "Sente na máquina com a ponta dos pés na plataforma e as coxas sob a almofada ajustada à sua altura.",
    "Eleve levemente os calcanhares para soltar a trava. Essa é a posição inicial.",
    "Desça os calcanhares devagar até alongar completamente, inspirando.",
    "Eleve os calcanhares ao máximo contraindo a panturrilha, expirando, e segure um segundo.",
  ]),
  demo("Calf_Press_On_The_Leg_Press_Machine", "Panturrilha no leg press", "Calf Press On The Leg Press Machine", [
    "No leg press, estenda as pernas sem travar os joelhos e posicione apenas a ponta dos pés na parte inferior da plataforma, calcanhares para fora.",
    "Empurre a plataforma elevando os calcanhares ao máximo, expirando, com os joelhos fixos. Segure um segundo.",
    "Volte devagar inspirando até a panturrilha alongar.",
  ]),
  demo("Cable_Crunch", "Abdominal na polia", "Cable Crunch", [
    "Ajoelhe abaixo da polia alta com a corda e segure-a com as mãos ao lado da cabeça.",
    "Flexione levemente o quadril e deixe a lombar estender um pouco. Essa é a posição inicial.",
    "Com o quadril parado, enrole o tronco contraindo o abdômen e levando os cotovelos em direção ao meio das coxas, expirando. Segure um segundo.",
    "Volte devagar mantendo tensão no abdômen. Não use carga que faça a lombar trabalhar.",
  ]),
  demo("Plank", "Prancha abdominal", "Plank", [
    "Deite de bruços e apoie o peso nos antebraços e na ponta dos pés, cotovelos diretamente abaixo dos ombros.",
    "Mantenha o corpo em linha reta da cabeça aos calcanhares, glúteos e abdômen contraídos, e sustente pelo tempo prescrito.",
    "Para dificultar, eleve um braço ou uma perna.",
  ]),
  demo("Flat_Bench_Lying_Leg_Raise", "Elevação de pernas", "Flat Bench Lying Leg Raise", [
    "Deite de costas em um banco com as pernas estendidas para fora da borda e as mãos sob os glúteos ou segurando o banco.",
    "Com as pernas estendidas e joelhos levemente flexionados, eleve-as até formarem 90° com o chão, expirando. Segure um segundo.",
    "Desça devagar inspirando até a posição inicial.",
  ]),
  demo("Crunches", "Abdominal supra", "Crunches", [
    "Deite de costas com os pés apoiados no chão ou sobre um banco, joelhos a 90°, mãos levemente ao lado da cabeça.",
    "Pressione a lombar contra o chão e enrole os ombros para cima, expirando; os ombros sobem apenas alguns centímetros.",
    "Contraia forte o abdômen no topo por um segundo e desça devagar inspirando. Sem impulso.",
  ]),
];

export const DEMOS_BY_ID: ReadonlyMap<string, ExerciseDemo> = new Map(EXERCISE_DEMOS.map((d) => [d.id, d]));

export function getDemo(id: string | null | undefined): ExerciseDemo | undefined {
  return id ? DEMOS_BY_ID.get(id) : undefined;
}
