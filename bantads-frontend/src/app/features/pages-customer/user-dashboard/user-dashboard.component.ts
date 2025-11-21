import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
// Importamos o serviço que conecta com o backend de contas
import { ServiceContaService } from '../../services/conta/service-conta.service';

@Component({
    selector: 'app-user-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './user-dashboard.component.html',
    styleUrl: './user-dashboard.component.css',
})
export class UserDashboardComponent implements OnInit {
    user: Cliente | null = null;
    balance: number = 0;
    depositsThisMonth: number = 0;
    recentActivity: Transaction[] = [];

    private sub?: Subscription;

    hideBalance = false;

    @HostBinding('class.dark') darkMode = false;

    constructor(
        private clientService: ClientService,
        private contaService: ServiceContaService // Injetamos o serviço de conta
    ) {}

    ngOnInit(): void {
        this.darkMode = localStorage.getItem('dashboardDarkMode') === 'true';

        this.sub = this.clientService.getLoggedClient().subscribe({
            next: (client) => {
                this.user = client ?? null;

                // O saldo vem da agregação do endpoint /clientes/:cpf (R13) do Gateway
                this.balance = this.user?.saldo ?? 0;

                // Se o usuário tem conta, buscamos o extrato real
                if (this.user && this.user.conta) {
                    // O backend retorna um objeto conta dentro do cliente, ou apenas o número em alguns casos
                    const numeroConta =
                        typeof this.user.conta === 'object'
                            ? (this.user.conta as any).numero
                            : this.user.conta;

                    if (numeroConta) {
                        this.loadRealTransactions(numeroConta);
                    }
                }
            },
            error: (err) =>
                console.error('Erro ao carregar dados do cliente:', err),
        });
    }

    loadRealTransactions(numeroConta: string) {
        // Chama o endpoint de extrato (R8)
        this.contaService.getStatement(numeroConta).subscribe({
            next: (records: any[]) => {
                // Mapeia o retorno do backend para o modelo Transaction do frontend
                const transactions: Transaction[] = records.map((r) => ({
                    id: r.id || Math.random().toString(36).substr(2, 9),
                    dateTime: new Date(r.dataHora || r.data),
                    operation: this.formatOperationName(r.tipo),
                    amount: r.valor,
                    clientId: this.user?.id,
                }));

                // 1. Filtra atividade recente (últimos 7 dias)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                sevenDaysAgo.setHours(0, 0, 0, 0);

                this.recentActivity = transactions
                    .filter((t) => t.dateTime >= sevenDaysAgo)
                    .sort(
                        (a, b) => b.dateTime.getTime() - a.dateTime.getTime()
                    );

                // 2. Calcula total de depósitos do mês atual
                const now = new Date();
                const firstDayOfMonth = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1
                );

                this.depositsThisMonth = transactions
                    .filter(
                        (t) =>
                            (t.operation === 'Depósito' ||
                                t.operation === 'DEPOSITO') &&
                            t.dateTime >= firstDayOfMonth
                    )
                    .reduce((sum, t) => sum + t.amount, 0);
            },
            error: (err) => console.error('Erro ao buscar extrato:', err),
        });
    }

    // Auxiliar para deixar o nome da operação amigável na tela
    private formatOperationName(tipo: string): string {
        const map: { [key: string]: string } = {
            DEPOSITO: 'Depósito',
            SAQUE: 'Saque',
            TRANSFERENCIA_ORIGEM: 'Transferência Enviada',
            TRANSFERENCIA_DESTINO: 'Transferência Recebida',
        };
        return map[tipo] || tipo;
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    toggleBalanceVisibility(): void {
        this.hideBalance = !this.hideBalance;
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        // opcional: salvar preferência no localStorage
        localStorage.setItem('dashboardDarkMode', String(this.darkMode));
    }
}
