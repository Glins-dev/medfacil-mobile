import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button, getFieldFrameStyles, Modal, NoticeCard } from "@/components";
import type { Specialty } from "@/services/catalog.service";
import { getSpecialtyImage } from "@/utils/specialtyIcons";

export interface SpecialtyDropdownProps {
  specialties: Specialty[];
  selectedSpecialty: Specialty | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onSelect: (specialty: Specialty) => void;
  disabled?: boolean;
}

function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0e706f"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

// Seletor dropdown acessivel de especialidades fiel ao design com rotulo interno e modal.
export function SpecialtyDropdown({
  specialties,
  selectedSpecialty,
  loading = false,
  error = false,
  onRetry,
  onSelect,
  disabled = false,
}: SpecialtyDropdownProps) {
  const [open, setOpen] = useState(false);

  const valueText = selectedSpecialty
    ? selectedSpecialty.name
    : loading
      ? "Carregando..."
      : "Selecione uma especialidade";

  const { haloStyle, boxStyle } = getFieldFrameStyles({
    active: open,
    error,
  });

  return (
    <View>
      <View style={haloStyle}>
        <Pressable
          onPress={() => setOpen(true)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={
            selectedSpecialty
              ? `Especialidade: ${selectedSpecialty.name}. Toque para alterar`
              : "Selecionar especialidade"
          }
          accessibilityState={{ expanded: open, disabled }}
          style={boxStyle}
          className={`min-h-[64px] flex-row items-center justify-between gap-3 px-4 py-2.5 active:opacity-85 ${
            disabled ? "opacity-60" : ""
          }`}
        >
        <View className="min-w-0 flex-1">
          <Text className="text-xs font-medium text-muted">Especialidade</Text>
          <Text
            numberOfLines={1}
            className={`mt-0.5 text-lg font-bold ${
              selectedSpecialty ? "text-ink" : "text-muted"
            }`}
          >
            {valueText}
          </Text>
        </View>

        <ChevronDownIcon color="#0e706f" />
        </Pressable>
      </View>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Escolha a especialidade"
        closeLabel="Fechar lista de especialidades"
      >
        <ScrollView
          className="max-h-[420px]"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-2.5 pb-2"
        >
          {loading ? (
            <View className="min-h-[120px] items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-6">
              <ActivityIndicator size="small" color="#0e706f" />
              <Text className="text-sm text-muted">
                Carregando especialidades...
              </Text>
            </View>
          ) : null}

          {!loading && error ? (
            <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
              <Text className="text-sm font-medium text-ink">
                Não foi possível carregar as especialidades.
              </Text>
              {onRetry ? (
                <Button
                  label="Tentar novamente"
                  variant="outline"
                  onPress={onRetry}
                />
              ) : null}
            </View>
          ) : null}

          {!loading && !error && specialties.length === 0 ? (
            <NoticeCard
              title="Nenhuma especialidade disponível"
              subtitle="Não há especialidades com atendimento ativo no momento."
            />
          ) : null}

          {!loading && !error && specialties.length > 0
            ? specialties.map((specialty) => {
                const isSelected = specialty.id === selectedSpecialty?.id;
                return (
                  <Pressable
                    key={specialty.id}
                    onPress={() => {
                      onSelect(specialty);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      specialty.description
                        ? `${specialty.name}. ${specialty.description}`
                        : specialty.name
                    }
                    accessibilityState={{ selected: isSelected }}
                    className={`min-h-[56px] flex-row items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 active:opacity-85 ${
                      isSelected
                        ? "border-brand bg-brand/10"
                        : "border-line bg-white"
                    }`}
                  >
                    <Image
                      source={getSpecialtyImage(specialty.name)}
                      resizeMode="contain"
                      className="h-10 w-10 shrink-0"
                    />

                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-bold text-ink">
                        {specialty.name}
                      </Text>
                      {specialty.description ? (
                        <Text className="mt-0.5 text-xs text-muted">
                          {specialty.description}
                        </Text>
                      ) : null}
                    </View>

                    {isSelected ? <CheckIcon /> : null}
                  </Pressable>
                );
              })
            : null}
        </ScrollView>
      </Modal>
    </View>
  );
}
